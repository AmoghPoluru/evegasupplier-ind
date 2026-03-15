'use client';

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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { trpc } from '@/trpc/client';
import { toast } from 'sonner';
import { useState } from 'react';

interface BuyerRejectionDialogProps {
  buyerId: string;
  buyerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BuyerRejectionDialog({
  buyerId,
  buyerName,
  open,
  onOpenChange,
  onSuccess,
}: BuyerRejectionDialogProps) {
  const [reason, setReason] = useState('');

  const rejectMutation = trpc.admin.buyers.reject.useMutation({
    onSuccess: () => {
      toast.success(`Buyer "${buyerName}" has been rejected`);
      setReason('');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to reject buyer: ${error.message}`);
    },
  });

  const handleReject = () => {
    rejectMutation.mutate({
      buyerId,
      reason: reason.trim() || undefined,
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Buyer Verification</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to reject <strong>{buyerName}</strong>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="rejection-reason" className="text-sm font-medium">
            Rejection Reason (Optional)
          </Label>
          <Textarea
            id="rejection-reason"
            placeholder="Enter reason for rejection..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-2"
            rows={3}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={rejectMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReject}
            disabled={rejectMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {rejectMutation.isPending ? 'Rejecting...' : 'Reject Buyer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
