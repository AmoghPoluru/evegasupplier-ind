'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/trpc/client';
import { format } from 'date-fns';

interface UserDetailModalProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function roleBadgeClass(role: string) {
  switch (role) {
    case 'admin':
      return 'bg-purple-50 text-purple-700 border-purple-300';
    case 'bdo':
      return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    case 'vendor':
      return 'bg-sky-50 text-sky-700 border-sky-300';
    case 'buyer':
      return 'bg-blue-50 text-blue-700 border-blue-300';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-300';
  }
}

export function UserDetailModal({ userId, open, onOpenChange }: UserDetailModalProps) {
  const { data: user, isLoading } = trpc.admin.users.getOne.useQuery(
    { userId },
    { enabled: open && !!userId },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>User details</DialogTitle>
          <DialogDescription>Account information and linked profiles.</DialogDescription>
        </DialogHeader>

        {isLoading || !user ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-right">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Name</dt>
              <dd className="font-medium text-right">{user.name || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4 items-center">
              <dt className="text-gray-500">Role</dt>
              <dd>
                <Badge variant="outline" className={roleBadgeClass(user.role)}>
                  {user.role}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Sign-in</dt>
              <dd className="font-medium text-right">{user.oauthProvider || 'email'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Supplier profile</dt>
              <dd className="font-medium text-right">
                {user.supplierProfile ? 'Yes' : 'No'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Buyer profile</dt>
              <dd className="font-medium text-right">
                {user.buyerProfile ? 'Yes' : 'No'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Created</dt>
              <dd className="font-medium text-right">
                {user.createdAt
                  ? format(new Date(user.createdAt), 'MMM d, yyyy HH:mm')
                  : '—'}
              </dd>
            </div>
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}
