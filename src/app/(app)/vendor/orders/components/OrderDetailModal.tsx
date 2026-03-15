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
import { Building2, Mail, Calendar, Package, ShoppingCart, MapPin } from 'lucide-react';

interface OrderDetailModalProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailModal({
  orderId,
  open,
  onOpenChange,
}: OrderDetailModalProps) {
  const { data: order, isLoading } = trpc.vendors.orders.getOne.useQuery(
    { orderId },
    { enabled: open && !!orderId }
  );

  if (!open) return null;

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
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
          <DialogDescription>
            View complete information about this order
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : order ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500">Order ID</label>
                <p className="text-sm font-medium">#{order.id.slice(0, 8)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Status</label>
                <div className="mt-1">{getStatusBadge(order.status)}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Order Date
                </label>
                <p className="text-sm">
                  {order.createdAt
                    ? format(new Date(order.createdAt), 'MMM d, yyyy HH:mm')
                    : 'Unknown'}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Total Amount</label>
                <p className="text-sm font-bold">
                  ${order.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Buyer Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Company Name</label>
                  <p className="text-sm">
                    {typeof order.buyer === 'object' && order.buyer
                      ? ((order.buyer as any).buyer?.companyName || (order.buyer as any).email || 'Unknown')
                      : 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <p className="text-sm">
                    {typeof order.buyer === 'object' && order.buyer && (order.buyer as any).email
                      ? (order.buyer as any).email
                      : 'No email'}
                  </p>
                </div>
              </div>
            </div>

            {(order as any).shippingAddress && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Shipping Address
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm">
                    {(order as any).shippingAddress.fullName && <>{((order as any).shippingAddress.fullName)}<br /></>}
                    {(order as any).shippingAddress.street && <>{((order as any).shippingAddress.street)}<br /></>}
                    {(order as any).shippingAddress.city && (order as any).shippingAddress.state && (
                      <>{(order as any).shippingAddress.city}, {(order as any).shippingAddress.state} {(order as any).shippingAddress.zipcode}<br /></>
                    )}
                    {(order as any).shippingAddress.country && <>{((order as any).shippingAddress.country)}</>}
                  </p>
                </div>
              </div>
            )}

            {order.products && Array.isArray(order.products) && order.products.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Products ({order.products.length})
                </h3>
                <div className="border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Unit Price</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {order.products.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm">
                            {typeof item.product === 'object' ? item.product.title : 'Product'}
                          </td>
                          <td className="px-4 py-2 text-sm">{item.quantity || 0}</td>
                          <td className="px-4 py-2 text-sm">
                            ${item.unitPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">
                            ${item.totalPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(order as any).phoneNumber && (
              <div>
                <label className="text-xs font-medium text-gray-500">Phone Number</label>
                <p className="text-sm">{(order as any).phoneNumber}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Order not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
