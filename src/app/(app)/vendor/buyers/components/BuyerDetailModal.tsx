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
import { Building2, Mail, ShoppingCart, DollarSign, Calendar } from 'lucide-react';
import Link from 'next/link';

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
  // Get buyer details - we'll need to fetch from buyers collection
  // For now, we'll show a placeholder since we need buyer profile data
  // In a real implementation, we'd need a tRPC query to get buyer by ID

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

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Information
            </h3>
            <p className="text-sm text-gray-500">
              Buyer details will be displayed here. This requires fetching buyer profile data.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              To view order history, visit the Orders page and filter by this buyer.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
