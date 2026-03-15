'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface BuyerFiltersProps {
  onFilterChange: (filters: {
    search?: string;
  }) => void;
  initialFilters?: {
    search?: string;
  };
}

export function BuyerFilters({ onFilterChange, initialFilters }: BuyerFiltersProps) {
  const [search, setSearch] = useState<string>(initialFilters?.search || '');

  const handleApply = () => {
    onFilterChange({
      search: search || undefined,
    });
  };

  const handleReset = () => {
    setSearch('');
    onFilterChange({});
  };

  const hasFilters = search;

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

      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">
            Search Company Name or Email
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
