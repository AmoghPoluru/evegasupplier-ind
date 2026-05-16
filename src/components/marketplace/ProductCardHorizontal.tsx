'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import type { Product } from '@/payload-types';
import { firstProductImageUrl, nextImageUnoptimizedForSrc } from '@/lib/media-url';

interface ProductCardHorizontalProps {
  product: Product;
}

/**
 * ProductCardHorizontal Component
 * 
 * Compact product card for horizontal scrolling display in vendor sections.
 * Shows product image, title, price, and MOQ.
 * 
 * @param product - Product data from Payload
 */
export function ProductCardHorizontal({ product }: ProductCardHorizontalProps) {
  const imageUrl = firstProductImageUrl(product.images);

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="w-40 sm:w-48 shrink-0 flex flex-col gap-2 p-3 rounded-lg border-2 border-border hover:border-primary hover:shadow-md transition-all cursor-pointer bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
        {/* Product Image */}
        <div className="w-full aspect-square rounded-md bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-2 border-blue-100 dark:border-blue-900/50 overflow-hidden flex items-center justify-center relative group">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.title || 'Product'}
              width={192}
              height={192}
              unoptimized={nextImageUnoptimizedForSrc(imageUrl)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <span className="text-xs text-muted-foreground">No Image</span>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col gap-1">
          {/* Product Title (truncated to 2 lines) */}
          <h5 className="text-xs font-semibold text-foreground line-clamp-2 min-h-10 group-hover:text-primary transition-colors">
            {product.title}
          </h5>

          {/* Price */}
          {product.unitPrice && (
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-red-600 dark:text-red-400">
                ${Number(product.unitPrice).toFixed(2)}
              </span>
              {product.bulkPricingTiers && 
               Array.isArray(product.bulkPricingTiers) && 
               product.bulkPricingTiers.length > 0 && (
                <span className="text-xs text-muted-foreground line-through">
                  ${Number((product.bulkPricingTiers[0] as any)?.price || product.unitPrice).toFixed(2)}
                </span>
              )}
            </div>
          )}

          {/* MOQ */}
          {product.moq && (
            <span className="text-xs text-muted-foreground font-medium">
              MOQ: {product.moq}
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}
