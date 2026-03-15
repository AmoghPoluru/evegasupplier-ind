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
import { SupplierDetailModal } from './SupplierDetailModal';
import { SupplierEditDialog } from './SupplierEditDialog';
import { SupplierDeleteDialog } from './SupplierDeleteDialog';

interface SupplierActionsProps {
  supplierId: string;
  supplierName: string;
  onSuccess?: () => void;
}

export function SupplierActions({
  supplierId,
  supplierName,
  onSuccess,
}: SupplierActionsProps) {
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

      <SupplierDetailModal
        supplierId={supplierId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <SupplierEditDialog
        supplierId={supplierId}
        supplierName={supplierName}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => {
          setEditOpen(false);
          onSuccess?.();
        }}
      />

      <SupplierDeleteDialog
        supplierId={supplierId}
        supplierName={supplierName}
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
