'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface UserFiltersProps {
  role: string;
  search: string;
  onRoleChange: (role: string) => void;
  onSearchChange: (search: string) => void;
}

export function UserFilters({
  role,
  search,
  onRoleChange,
  onSearchChange,
}: UserFiltersProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-white p-4 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        <Label htmlFor="user-search">Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            id="user-search"
            placeholder="Email or name…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-9"
          />
          {search ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
              onClick={() => onSearchChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="w-full space-y-2 sm:w-48">
        <Label>Role</Label>
        <Select value={role} onValueChange={onRoleChange}>
          <SelectTrigger>
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="bdo">BDO</SelectItem>
            <SelectItem value="vendor">Vendor</SelectItem>
            <SelectItem value="buyer">Buyer</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
