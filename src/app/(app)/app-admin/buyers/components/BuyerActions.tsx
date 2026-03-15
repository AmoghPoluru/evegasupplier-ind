'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { BuyerDetailModal } from './BuyerDetailModal';
import { BuyerEditDialog } from './BuyerEditDialog';
import { BuyerDeleteDialog } from './BuyerDeleteDialog';

interface BuyerActionsProps {
  buyerId: string;
  buyerName: string;
  onSuccess?: () => void;
}

export function BuyerActions({
  buyerId,
  buyerName,
  onSuccess,
}: BuyerActionsProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setDetailOpen(true)}>
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-red-600"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BuyerDetailModal
        buyerId={buyerId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <BuyerEditDialog
        buyerId={buyerId}
        buyerName={buyerName}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => {
          setEditOpen(false);
          onSuccess?.();
        }}
      />

      <BuyerDeleteDialog
        buyerId={buyerId}
        buyerName={buyerName}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSuccess={() => {
          setDeleteOpen(false);
          onSuccess?.();
        }}
      />
    </>
  );
}
