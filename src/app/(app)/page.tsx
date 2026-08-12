'use client';

import { useState, useLayoutEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { trpc } from '@/trpc/client';
import { ProductGridCard } from '@/components/marketplace/ProductGridCard';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { useDebounce } from '@/hooks/use-debounce';
import { AlertCircle, Loader2, Search } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Sort: Newest' },
  { value: 'priceAsc', label: 'Price: low to high' },
  { value: 'priceDesc', label: 'Price: high to low' },
  { value: 'moqAsc', label: 'MOQ: low to high' },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]['value'];

function SuppliersMarketplaceList() {
  const searchParams = useSearchParams();
  const limit = 20;

  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [page, setPage] = useState(1);

  const search = useDebounce(searchInput, 300);
  const supplierId = searchParams.get('supplier') || undefined;

  // Reset pagination whenever the active query changes (derived state, no effect).
  const filterKey = JSON.stringify([supplierId, search, sort, verifiedOnly]);
  const [activeFilterKey, setActiveFilterKey] = useState(filterKey);
  if (activeFilterKey !== filterKey) {
    setActiveFilterKey(filterKey);
    setPage(1);
  }

  const { data, isLoading, error } = trpc.products.list.useQuery({
    limit,
    page,
    supplierId,
    search: search || undefined,
    sort,
    verified: verifiedOnly || undefined,
  });

  const products = data?.products ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">
        {/* Heading + slim toolbar (no banner, no category nav) */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">All products</h1>
            <p className="text-xs text-muted-foreground">
              {data ? `${data.totalDocs} products` : 'Loading products'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search products or SKU"
                className="h-9 w-56 pl-8 text-xs"
              />
            </div>

            <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
              <SelectTrigger className="w-[170px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Label className="flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-normal">
              <Checkbox
                checked={verifiedOnly}
                onCheckedChange={(checked) => setVerifiedOnly(checked === true)}
              />
              Verified only
            </Label>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading products...</span>
          </div>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <div>
                  <p className="font-semibold">Error loading products</p>
                  <p className="text-sm">{error.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Flat product grid: every product, vendor shown per card */}
        {products.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => (
              <ProductGridCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {data && products.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-lg font-semibold text-foreground mb-2">No products found</p>
                <p className="text-sm text-muted-foreground">
                  Try clearing the search or verified filters.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {data && totalPages > 1 && (
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
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5 || page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
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
                {totalPages > 5 && page < totalPages - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) setPage(page + 1);
                    }}
                    className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <div className="text-center mt-4 text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, data.totalDocs)} of{' '}
              {data.totalDocs} products
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const browse = searchParams.get('browse') === '1';
  const { data: session, isLoading } = trpc.auth.session.useQuery();

  useLayoutEffect(() => {
    if (isLoading) return;
    if (!session?.user) return;
    const role = (session.user as { role?: string }).role;
    if (role === 'bdo' && !browse) {
      router.replace('/bdo/dashboard');
    } else if (role === 'vendor' && !browse) {
      router.replace('/vendor/dashboard');
    }
  }, [isLoading, session, browse, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading...</span>
          </div>
        </main>
      </div>
    );
  }

  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role === 'bdo' && !browse) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Opening coordinator dashboard…</span>
          </div>
        </main>
      </div>
    );
  }

  if (role === 'vendor' && !browse) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Opening supplier dashboard…</span>
          </div>
        </main>
      </div>
    );
  }

  return <SuppliersMarketplaceList />;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <main className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading...</span>
            </div>
          </main>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
