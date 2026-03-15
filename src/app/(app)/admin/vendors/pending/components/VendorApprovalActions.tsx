'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { trpc } from '@/trpc/client';
import { toast } from 'sonner';
import { VendorRejectionDialog } from './VendorRejectionDialog';

interface VendorApprovalActionsProps {
  vendorId: string;
  vendorName: string;
  onSuccess?: () => void;
}

export function VendorApprovalActions({
  vendorId,
  vendorName,
  onSuccess,
}: VendorApprovalActionsProps) {
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);

  const approveMutation = trpc.admin.vendors.approve.useMutation({
    onSuccess: () => {
      toast.success(`Vendor "${vendorName}" has been approved and activated`);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to approve vendor: ${error.message}`);
    },
  });

  const handleApprove = () => {
    approveMutation.mutate({ vendorId });
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        size="sm"
        variant="default"
        onClick={handleApprove}
        disabled={approveMutation.isPending}
        className="bg-green-600 hover:bg-green-700"
      >
        <CheckCircle className="w-4 h-4 mr-1" />
        Approve
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setRejectionDialogOpen(true)}
        disabled={approveMutation.isPending}
      >
        <XCircle className="w-4 h-4 mr-1" />
        Reject
      </Button>

      <VendorRejectionDialog
        vendorId={vendorId}
        vendorName={vendorName}
        open={rejectionDialogOpen}
        onOpenChange={setRejectionDialogOpen}
        onSuccess={onSuccess}
      />
    </div>
  );
}
