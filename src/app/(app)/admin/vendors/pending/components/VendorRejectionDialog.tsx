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

interface VendorRejectionDialogProps {
  vendorId: string;
  vendorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function VendorRejectionDialog({
  vendorId,
  vendorName,
  open,
  onOpenChange,
  onSuccess,
}: VendorRejectionDialogProps) {
  const [reason, setReason] = useState('');

  const rejectMutation = trpc.admin.vendors.reject.useMutation({
    onSuccess: () => {
      toast.success(`Vendor "${vendorName}" has been rejected`);
      setReason('');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to reject vendor: ${error.message}`);
    },
  });

  const handleReject = () => {
    rejectMutation.mutate({
      vendorId,
      reason: reason.trim() || undefined,
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Vendor Application</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to reject <strong>{vendorName}</strong>? This action cannot be undone.
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
            {rejectMutation.isPending ? 'Rejecting...' : 'Reject Vendor'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
