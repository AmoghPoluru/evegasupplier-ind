'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/trpc/client';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

interface BuyerDeleteDialogProps {
  buyerId: string;
  buyerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BuyerDeleteDialog({
  buyerId,
  buyerName,
  open,
  onOpenChange,
  onSuccess,
}: BuyerDeleteDialogProps) {
  const [confirmText, setConfirmText] = useState('');

  // Get buyer details to show counts
  const { data: buyer } = trpc.admin.buyers.getOne.useQuery(
    { buyerId },
    { enabled: open && !!buyerId }
  );

  const deleteMutation = trpc.admin.buyers.delete.useMutation({
    onSuccess: (data) => {
      const { deleted } = data;
      const summary = [];
      if (deleted.buyer) summary.push('buyer profile');
      if (deleted.user) summary.push('user account');
      if (deleted.orders > 0) summary.push(`${deleted.orders} order${deleted.orders !== 1 ? 's' : ''}`);

      toast.success(
        `Successfully deleted ${summary.join(', ')}`
      );
      setConfirmText('');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to delete buyer: ${error.message}`);
    },
  });

  const handleDelete = () => {
    if (confirmText === 'DELETE') {
      deleteMutation.mutate({ buyerId });
    }
  };

  const isConfirmValid = confirmText === 'DELETE';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Delete Buyer
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to delete <strong>{buyerName}</strong>? This action cannot be undone.
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm font-medium text-red-900 mb-2">
                This will permanently delete:
              </p>
              <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                <li>Buyer profile</li>
                <li>User account (if no supplier profile exists)</li>
                <li>
                  {buyer?.orderCount || 0} order{((buyer?.orderCount || 0) !== 1) ? 's' : ''}
                </li>
              </ul>
            </div>

            <div className="pt-2">
              <Label htmlFor="confirm-delete" className="text-sm font-medium">
                Type <strong>DELETE</strong> to confirm:
              </Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="mt-1"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmValid || deleteMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Buyer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
