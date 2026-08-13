'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, CheckCircle2, Star, ArrowRight } from 'lucide-react';
import { ProductCardHorizontal } from './ProductCardHorizontal';
import type { Supplier, Product } from '@/payload-types';

interface VendorSectionProps {
  vendor: Supplier & { products?: Product[] };
}

/**
 * VendorSection Component
 * 
 * Displays a vendor section matching the design:
 * - Vendor name with verification badge on the right
 * - Location and response time below
 * - Horizontal scroll of products
 * - "View more" link on the right side
 * 
 * @param vendor - Vendor data with optional products array
 */
export function VendorSection({ vendor }: VendorSectionProps) {
  const products = vendor.products || [];

  return (
    <section className="mb-12 p-6 rounded-xl bg-gradient-to-r from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/20 border border-blue-100/50 dark:border-blue-900/30">
      {/* Vendor Header - Company Name and Badge on same line */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
          {vendor.companyName}
        </h2>
        
        {/* Verification Badge - Positioned on the right, same line */}
        {vendor.verifiedSupplier && (
          <Badge variant="default" className="gap-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 rounded-full px-3 py-1 shadow-md hover:shadow-lg transition-shadow">
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
      <div className="flex items-center gap-4 text-sm mb-4">
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

      {/* Products Horizontal Scroll with View More */}
      {products.length > 0 ? (
        <div className="flex items-center gap-4">
          {/* Products Container - Scrollable */}
          <div className="flex-1 flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent -webkit-overflow-scrolling-touch">
            {products.map((product) => (
              <ProductCardHorizontal key={product.id} product={product} />
            ))}
          </div>
          
          {/* View More Link - Fixed on the right */}
          <div className="shrink-0 flex items-center">
            <Link 
              href={`/vendors/${vendor.id}`}
              className="flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-purple-600 dark:hover:text-purple-400 hover:underline transition-colors"
            >
              View more
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground py-8 text-center">
          No products available
        </div>
      )}
    </section>
  );
}
