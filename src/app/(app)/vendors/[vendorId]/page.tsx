'use client';

import { notFound } from 'next/navigation';
import { trpc } from '@/trpc/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, CheckCircle2, Star, Loader2, AlertCircle, Building2, Users, DollarSign } from 'lucide-react';
import { ProductGrid } from '@/components/marketplace/ProductGrid';
import Image from 'next/image';
import { nextImageUnoptimizedForSrc } from '@/lib/media-url';
import { use } from 'react';

interface VendorDetailPageProps {
  params: Promise<{
    vendorId: string;
  }>;
}

export default function VendorDetailPage({ params }: VendorDetailPageProps) {
  // Unwrap the Promise using React.use()
  const { vendorId } = use(params);

  const { data: vendorData, isLoading, error } = trpc.vendors.marketplace.getById.useQuery({
    id: vendorId,
  }, {
    enabled: !!vendorId,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading vendor...</span>
          </div>
        </main>
      </div>
    );
  }

  if (error || !vendorData) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <div>
                  <p className="font-semibold">Error loading vendor</p>
                  <p className="text-sm">{error?.message || 'Vendor not found'}</p>
                  {vendorId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Vendor ID: {vendorId}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const vendor = vendorData;
  const products = vendor.products || [];

  // Get vendor logo/image
  const getLogoUrl = () => {
    if (!vendor.companyPhotos || !Array.isArray(vendor.companyPhotos) || vendor.companyPhotos.length === 0) {
      return null;
    }
    const firstPhoto = vendor.companyPhotos[0];
    if (typeof firstPhoto === 'string') {
      return firstPhoto;
    }
    if (typeof firstPhoto === 'object' && firstPhoto !== null && 'url' in firstPhoto) {
      return (firstPhoto as any).url;
    }
    return null;
  };

  const logoUrl = getLogoUrl();

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Vendor Header Section */}
        <div className="mb-8">
          <Card className="border-2 border-blue-100/50 dark:border-blue-900/30 bg-gradient-to-r from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                {/* Logo */}
                {logoUrl && (
                  <div className="shrink-0">
                    <div className="w-24 h-24 rounded-lg border-2 border-blue-200 dark:border-blue-800 overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
                      <Image
                        src={logoUrl}
                        alt={vendor.companyName || 'Company logo'}
                        width={96}
                        height={96}
                        unoptimized={nextImageUnoptimizedForSrc(logoUrl)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Company Name and Badges */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                      {vendor.companyName}
                    </h1>
                    {vendor.verifiedSupplier && (
                      <Badge variant="default" className="gap-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 rounded-full px-3 py-1 shadow-md">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified
                      </Badge>
                    )}
                    {vendor.goldSupplier && (
                      <Badge variant="secondary" className="gap-1.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-white border-0 rounded-full px-3 py-1 shadow-md">
                        <Star className="w-3.5 h-3.5 fill-white" />
                        Gold Supplier
                      </Badge>
                    )}
                  </div>

                  {/* Location and Response Time */}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    {vendor.factoryLocation && (
                      <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-medium">
                        <MapPin className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                        <span>{vendor.factoryLocation}</span>
                      </div>
                    )}
                    {vendor.responseTime && (
                      <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-medium">
                        <Clock className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
                        <span>Response: {vendor.responseTime}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Company Information Section */}
        {vendor.companyHistory && (
          <Card className="mb-8 border-blue-100/50 dark:border-blue-900/30">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                About Us
              </h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{vendor.companyHistory}</p>
              
              {/* Quality Certifications */}
              {vendor.qualityCertifications && Array.isArray(vendor.qualityCertifications) && vendor.qualityCertifications.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold mb-2">Quality Certifications</h3>
                  <div className="flex flex-wrap gap-2">
                    {vendor.qualityCertifications.map((cert: any, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {typeof cert === 'string' ? cert : cert?.certification || String(cert)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Statistics Cards */}
        {(vendor.yearEstablished || vendor.employeeCount || vendor.annualRevenue) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {vendor.yearEstablished && (
              <Card className="border-blue-100/50 dark:border-blue-900/30 bg-gradient-to-br from-blue-50/50 to-purple-50/30 dark:from-blue-950/20 dark:to-purple-950/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-muted-foreground">Established</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{vendor.yearEstablished}</p>
                </CardContent>
              </Card>
            )}
            {vendor.employeeCount && (
              <Card className="border-purple-100/50 dark:border-purple-900/30 bg-gradient-to-br from-purple-50/50 to-pink-50/30 dark:from-purple-950/20 dark:to-pink-950/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm text-muted-foreground">Employees</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{vendor.employeeCount.toLocaleString()}</p>
                </CardContent>
              </Card>
            )}
            {vendor.annualRevenue && (
              <Card className="border-pink-100/50 dark:border-pink-900/30 bg-gradient-to-br from-pink-50/50 to-blue-50/30 dark:from-pink-950/20 dark:to-blue-950/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                    <span className="text-sm text-muted-foreground">Annual Revenue</span>
                  </div>
                  <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                    ${(Number(vendor.annualRevenue) / 1000000).toFixed(1)}M
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Products Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            Products ({products.length})
          </h2>
          {products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-lg font-semibold text-foreground mb-2">
                    No products available
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This supplier hasn't added any products yet.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
