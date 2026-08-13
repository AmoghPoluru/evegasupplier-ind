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
import { UserDetailModal } from './UserDetailModal';
import { UserEditDialog } from './UserEditDialog';
import { UserDeleteDialog } from './UserDeleteDialog';

interface UserActionsProps {
  userId: string;
  userLabel: string;
  onSuccess?: () => void;
}

export function UserActions({ userId, userLabel, onSuccess }: UserActionsProps) {
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
            View details
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

      <UserDetailModal
        userId={userId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <UserEditDialog
        userId={userId}
        userLabel={userLabel}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => {
          setEditOpen(false);
          onSuccess?.();
        }}
      />

      <UserDeleteDialog
        userId={userId}
        userLabel={userLabel}
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
