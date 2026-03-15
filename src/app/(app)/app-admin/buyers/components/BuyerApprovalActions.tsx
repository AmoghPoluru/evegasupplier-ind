'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { trpc } from '@/trpc/client';
import { toast } from 'sonner';
import { BuyerRejectionDialog } from './BuyerRejectionDialog';

interface BuyerApprovalActionsProps {
  buyerId: string;
  buyerName: string;
  onSuccess?: () => void;
}

export function BuyerApprovalActions({
  buyerId,
  buyerName,
  onSuccess,
}: BuyerApprovalActionsProps) {
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);

  const approveMutation = trpc.admin.buyers.approve.useMutation({
    onSuccess: () => {
      toast.success(`Buyer "${buyerName}" has been approved and verified`);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to approve buyer: ${error.message}`);
    },
  });

  const handleApprove = () => {
    approveMutation.mutate({ buyerId });
  };

  return (
    <>
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

      <BuyerRejectionDialog
        buyerId={buyerId}
        buyerName={buyerName}
        open={rejectionDialogOpen}
        onOpenChange={setRejectionDialogOpen}
        onSuccess={onSuccess}
      />
    </>
  );
}
