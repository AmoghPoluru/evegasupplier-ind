'use client';

import { useState } from 'react';
import { trpc } from '@/trpc/client';
import { VendorSection } from '@/components/marketplace/VendorSection';
import { Card, CardContent } from '@/components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function VendorsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [verified, setVerified] = useState<boolean | undefined>(undefined);
  const [location, setLocation] = useState('');
  const [sort, setSort] = useState<'newest' | 'verified' | 'name'>('newest');
  const limit = 10;

  const { data, isLoading, error } = trpc.vendors.marketplace.list.useQuery({
    limit,
    page,
    includeProducts: true,
    search: search || undefined,
    verified,
    location: location || undefined,
    sort,
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-2">
            All Suppliers
          </h1>
          <p className="text-muted-foreground text-lg">
            Browse all available suppliers and their products
          </p>
        </div>

        {/* Filters - Removed */}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading suppliers...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <div>
                  <p className="font-semibold">Error loading suppliers</p>
                  <p className="text-sm">{error.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vendor Sections */}
        {data && data.vendors.length > 0 && (
          <div className="space-y-12">
            {data.vendors.map((vendor) => (
              <VendorSection key={vendor.id} vendor={vendor} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {data && data.vendors.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-lg font-semibold text-foreground mb-2">
                  No suppliers found
                </p>
                <p className="text-sm text-muted-foreground">
                  {search || location || verified !== undefined
                    ? 'Try adjusting your filters to see more results.'
                    : 'Check back later or create a supplier account to get started.'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="mt-8">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) setPage(page - 1);
                    }}
                    className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (data.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= data.totalPages - 2) {
                    pageNum = data.totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(pageNum);
                        }}
                        isActive={page === pageNum}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                {data.totalPages > 5 && page < data.totalPages - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < data.totalPages) setPage(page + 1);
                    }}
                    className={page >= data.totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <div className="text-center mt-4 text-sm text-muted-foreground">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.totalDocs)} of {data.totalDocs} suppliers
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
