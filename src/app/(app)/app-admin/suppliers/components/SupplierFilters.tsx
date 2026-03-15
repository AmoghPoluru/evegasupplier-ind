'use client';

import { useState, useEffect } from 'react';
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

interface SupplierFiltersProps {
  onFilterChange: (filters: {
    status?: string;
    isActive?: boolean;
    companyType?: string;
    search?: string;
  }) => void;
  initialFilters?: {
    status?: string;
    isActive?: boolean;
    companyType?: string;
    search?: string;
  };
}

export function SupplierFilters({ onFilterChange, initialFilters }: SupplierFiltersProps) {
  const [status, setStatus] = useState<string>(initialFilters?.status || 'all');
  const [isActive, setIsActive] = useState<string>(initialFilters?.isActive !== undefined ? String(initialFilters.isActive) : 'all');
  const [companyType, setCompanyType] = useState<string>(initialFilters?.companyType || 'all');
  const [search, setSearch] = useState<string>(initialFilters?.search || '');

  const handleApply = () => {
    onFilterChange({
      status: status !== 'all' ? status : undefined,
      isActive: isActive !== 'all' ? isActive === 'true' : undefined,
      companyType: companyType !== 'all' ? companyType : undefined,
      search: search || undefined,
    });
  };

  const handleReset = () => {
    setStatus('all');
    setIsActive('all');
    setCompanyType('all');
    setSearch('');
    onFilterChange({});
  };

  const hasFilters = status !== 'all' || isActive !== 'all' || companyType !== 'all' || search;

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">
            Active Status
          </label>
          <Select value={isActive} onValueChange={setIsActive}>
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Active Only</SelectItem>
              <SelectItem value="false">Inactive Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">
            Company Type
          </label>
          <Select value={companyType} onValueChange={setCompanyType}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="manufacturer">Manufacturer</SelectItem>
              <SelectItem value="trading">Trading Company</SelectItem>
              <SelectItem value="agent">Agent</SelectItem>
              <SelectItem value="distributor">Distributor</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">
            Search Company Name
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
