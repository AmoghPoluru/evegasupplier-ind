'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';

interface OrderFiltersProps {
  onFilterChange: (filters: {
    status?: string;
    search?: string;
  }) => void;
  initialFilters?: {
    status?: string;
    search?: string;
  };
}

export function OrderFilters({ onFilterChange, initialFilters }: OrderFiltersProps) {
  const [status, setStatus] = useState<string>(initialFilters?.status || 'all');
  const [search, setSearch] = useState<string>(initialFilters?.search || '');

  const handleApply = () => {
    onFilterChange({
      status: status !== 'all' ? status : undefined,
      search: search || undefined,
    });
  };

  const handleReset = () => {
    setStatus('all');
    setSearch('');
    onFilterChange({});
  };

  const hasFilters = status !== 'all' || search;

  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <X className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">
            Status
          </label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_production">In Production</SelectItem>
              <SelectItem value="quality_check">Quality Check</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="disputed">Disputed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">
            Search Order ID / PO Number
          </label>
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleApply();
              }
            }}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleApply}>Apply Filters</Button>
      </div>
    </div>
  );
}
