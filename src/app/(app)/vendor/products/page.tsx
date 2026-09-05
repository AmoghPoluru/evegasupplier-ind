'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { trpc } from '@/trpc/client';
import { ProductsTable } from './components/ProductsTable';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Search, X } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { toast } from 'sonner';
import { MassUploadPhotosDialog } from './components/MassUploadPhotosDialog';

export default function VendorProductsPage() {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [category, setCategory] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const limit = 20;
  
  const debouncedSearch = useDebounce(searchInput, 300);
  const utils = trpc.useUtils();

  const bulkUpdateMutation = trpc.vendors.products.bulkUpdate.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.success} products updated successfully`);
      utils.products.getByVendor.invalidate();
      setSelectedProducts([]);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update products');
    },
  });

  // Get vendor for current user
  const { data: vendor, isLoading: vendorLoading } = trpc.vendors.getByUser.useQuery(
    { userId: user?.id || '' },
    { enabled: !!user?.id }
  );

  // Get products for vendor
  const { data, isLoading, error } = trpc.products.getByVendor.useQuery(
    {
      vendorId: vendor?.id || '',
      limit,
      page,
      search: debouncedSearch || undefined,
      status,
      category: category || undefined,
    },
    { enabled: !!vendor?.id }
  );

  if (vendorLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No vendor profile found. Please create a vendor profile first.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your product catalog
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedProducts.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Bulk Actions ({selectedProducts.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => {
                    bulkUpdateMutation.mutate({
                      productIds: selectedProducts,
                      action: 'publish',
                    });
                  }}
                >
                  Publish Selected
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    bulkUpdateMutation.mutate({
                      productIds: selectedProducts,
                      action: 'archive',
                    });
                  }}
                >
                  Archive Selected
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => {
                    bulkUpdateMutation.mutate({
                      productIds: selectedProducts,
                      action: 'delete',
                    });
                  }}
                >
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <MassUploadPhotosDialog companyName={vendor.companyName} />
          <Link href="/vendor/products/import">
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
          </Link>
          <Link href="/vendor/products/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-4">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search products by name, description, or SKU..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              className="pl-10 pr-10"
            />
            {searchInput && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => {
                  setSearchInput('');
                  setPage(1);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Status Filter */}
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as 'all' | 'published' | 'draft' | 'archived');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Input
            type="text"
            placeholder="Filter by category..."
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="w-[180px]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">
          Error loading products: {error.message}
        </div>
      ) : (
        <ProductsTable
          products={(data?.products || []) as any}
          totalDocs={data?.totalDocs || 0}
          page={page}
          totalPages={data?.totalPages || 0}
          onPageChange={setPage}
          selectedProducts={selectedProducts}
          onSelectionChange={setSelectedProducts}
        />
      )}
    </div>
  );
}
