'use client';

import { useState } from 'react';
import { trpc } from '@/trpc/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { UserFilters } from './UserFilters';
import { UserActions } from './UserActions';
import { UserCreateDialog } from './UserCreateDialog';

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

export function UsersList() {
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, refetch } = trpc.admin.users.list.useQuery({
    page,
    limit: 20,
    role: role as 'all' | 'user' | 'vendor' | 'buyer' | 'admin' | 'bdo',
    search: search || undefined,
    sort: sort as
      | 'createdAt'
      | '-createdAt'
      | 'email'
      | '-email'
      | 'name'
      | '-name'
      | 'role'
      | '-role',
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load users</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <UserFilters
        role={role}
        search={search}
        onRoleChange={(value) => {
          setRole(value);
          setPage(1);
        }}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      />

      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create user
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Sort by</span>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-createdAt">Newest first</SelectItem>
                <SelectItem value="createdAt">Oldest first</SelectItem>
                <SelectItem value="email">Email (A–Z)</SelectItem>
                <SelectItem value="-email">Email (Z–A)</SelectItem>
                <SelectItem value="name">Name (A–Z)</SelectItem>
                <SelectItem value="-name">Name (Z–A)</SelectItem>
                <SelectItem value="role">Role</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-gray-600">
            {data.total} user{data.total !== 1 ? 's' : ''} total
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Sign-in</TableHead>
              <TableHead>Profiles</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <p className="text-lg font-semibold text-gray-900">No users found</p>
                  <p className="mt-2 text-sm text-gray-500">
                    Try adjusting filters or create a new user.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              data.users.map((user) => {
                const label = user.email || user.name || user.id;
                const profiles: string[] = [];
                if (user.hasSupplierProfile) profiles.push('Supplier');
                if (user.hasBuyerProfile) profiles.push('Buyer');

                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleBadgeClass(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.oauthProvider || 'email'}</TableCell>
                    <TableCell>{profiles.length ? profiles.join(', ') : '—'}</TableCell>
                    <TableCell>
                      {user.createdAt
                        ? format(new Date(user.createdAt), 'MMM d, yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <UserActions
                        userId={user.id}
                        userLabel={label}
                        onSuccess={() => refetch()}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {data.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-gray-600">
              Page {data.page} of {data.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <UserCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          setCreateOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
