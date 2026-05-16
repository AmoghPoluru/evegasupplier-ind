'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Eye } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { toast } from 'sonner';
import type { Product } from '@/payload-types';
import {
  firstProductImageUrl,
  nextImageUnoptimizedForSrc,
  productImagesForCart,
} from '@/lib/media-url';

interface ProductCardProps {
  product: Product;
}

/**
 * ProductCard Component
 * 
 * Larger product card for grid view display.
 * Shows product image, title, description, price, MOQ, category badge, View Details and Add to Cart.
 * 
 * @param product - Product data from Payload
 */
export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore();
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!product.unitPrice || !product.moq) {
      toast.error('Product pricing information is missing');
      return;
    }
    
    const productData = {
      id: product.id,
      title: product.title || 'Product',
      unitPrice: Number(product.unitPrice),
      moq: product.moq || 1,
      images: productImagesForCart(product.images),
    };
    
    addItem(productData as any, product.moq || 1);
    toast.success('Product added to cart');
  };
  
  const imageUrl = firstProductImageUrl(product.images);

  return (
    <Card className="flex flex-col h-full rounded-lg border-2 border-border hover:border-primary hover:shadow-lg transition-all bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 group">
      {/* Product Image */}
      <Link href={`/products/${product.id}`} className="relative">
        <div className="w-full aspect-square rounded-t-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-b-2 border-blue-100 dark:border-blue-900/50 overflow-hidden flex items-center justify-center relative">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.title || 'Product'}
              width={400}
              height={400}
              unoptimized={nextImageUnoptimizedForSrc(imageUrl)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <span className="text-sm text-muted-foreground">No Image</span>
          )}
          
          {/* Category Badge - Top Right */}
          {product.category && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
                {product.category}
              </Badge>
            </div>
          )}
        </div>
      </Link>

      {/* Product Info */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Product Title */}
        <Link href={`/products/${product.id}`}>
          <h3 className="text-lg font-semibold line-clamp-2 min-h-[3rem] group-hover:text-primary transition-colors">
            {product.title}
          </h3>
        </Link>

        {/* Product Description */}
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
            {product.description}
          </p>
        )}

        {/* Price and MOQ */}
        <div className="flex flex-col gap-2">
          {product.unitPrice && (
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-red-600 dark:text-red-400">
                ${Number(product.unitPrice).toFixed(2)}
              </span>
              {product.bulkPricingTiers && 
               Array.isArray(product.bulkPricingTiers) && 
               product.bulkPricingTiers.length > 0 && (
                <span className="text-sm text-muted-foreground line-through">
                  ${Number((product.bulkPricingTiers[0] as any)?.price || product.unitPrice).toFixed(2)}
                </span>
              )}
            </div>
          )}

          {product.moq && (
            <Badge variant="outline" className="text-xs w-fit">
              MOQ: {product.moq}
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 mt-auto pt-2">
          <Link href={`/products/${product.id}`} className="flex-1">
            <Button variant="ghost" className="w-full" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
          </Link>
          <Button 
            variant="default" 
            className="flex-1" 
            size="sm"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
        </div>
      </div>
    </Card>
  );
}
