'use client';

import { useState, useEffect, useLayoutEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/trpc/client';
import { VendorSection } from '@/components/marketplace/VendorSection';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { AlertCircle, Loader2, Lock, LogIn } from 'lucide-react';

function LoginGate() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-2">
            Suppliers Marketplace
          </h1>
          <p className="text-muted-foreground text-lg">
            Discover trusted suppliers and their products
          </p>
        </div>

        <Card className="mx-auto max-w-lg border-dashed">
          <CardContent className="space-y-4 pt-6">
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Lock className="h-6 w-6 text-muted-foreground" aria-hidden />
              </div>
            </div>
            <Alert>
              <LogIn className="h-4 w-4" />
              <AlertTitle>Please log in</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>You need to be signed in to view the home page and browse suppliers.</p>
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/signup">Create an account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function SuppliersMarketplaceList() {
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const limit = 10;

  const supplierId = searchParams.get('supplier') || undefined;

  useEffect(() => {
    setPage(1);
  }, [supplierId]);

  const { data, isLoading, error } = trpc.vendors.marketplace.list.useQuery({
    limit,
    page,
    includeProducts: true,
    supplierId: supplierId || undefined,
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-2">
            Suppliers Marketplace
          </h1>
          <p className="text-muted-foreground text-lg">
            Discover trusted suppliers and their products
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading suppliers...</span>
          </div>
        )}

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

        {data && data.vendors.length > 0 && (
          <div className="space-y-12">
            {data.vendors.map((vendor) => (
              <VendorSection key={vendor.id} vendor={vendor} />
            ))}
          </div>
        )}

        {data && data.vendors.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-lg font-semibold text-foreground mb-2">No suppliers found</p>
                <p className="text-sm text-muted-foreground">
                  {supplierId
                    ? 'Try selecting a different supplier to see more results.'
                    : 'Check back later or create a supplier account to get started.'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

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
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, data.totalDocs)} of{' '}
              {data.totalDocs} suppliers
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

  if (!session?.user) {
    return <LoginGate />;
  }

  const role = (session.user as { role?: string }).role;
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
